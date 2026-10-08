#!/usr/bin/env python
"""Build a leakage-aware one-class YOLO detection dataset from Roboflow polygons."""

from __future__ import annotations

import argparse
import ast
import csv
import hashlib
import json
import math
import re
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
CAPTURE_RE = re.compile(
    r"^WhatsApp-Image-(\d{4}-\d{2}-\d{2})-at-(\d+)-(\d+)-(\d+)-(AM|PM)",
    re.IGNORECASE,
)


@dataclass
class ImageRecord:
    image_path: Path
    label_path: Path
    source_split: str
    image_hash: str
    timestamp_key: str | None
    timestamp: datetime | None
    polygons: list[tuple[int, list[float]]]


class UnionFind:
    def __init__(self, count: int) -> None:
        self.parents = list(range(count))
        self.ranks = [0] * count

    def find(self, item: int) -> int:
        if self.parents[item] != item:
            self.parents[item] = self.find(self.parents[item])
        return self.parents[item]

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if self.ranks[left_root] < self.ranks[right_root]:
            left_root, right_root = right_root, left_root
        self.parents[right_root] = left_root
        if self.ranks[left_root] == self.ranks[right_root]:
            self.ranks[left_root] += 1


def parse_class_names(data_yaml: Path) -> list[str]:
    for line in data_yaml.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\s*names\s*:\s*(\[.*\])\s*$", line)
        if match:
            names = ast.literal_eval(match.group(1))
            if isinstance(names, list) and names and all(
                isinstance(name, str) for name in names
            ):
                return names
    raise ValueError(f"Could not parse a class-name list from {data_yaml}")


def capture_time(image_path: Path) -> tuple[str | None, datetime | None]:
    match = CAPTURE_RE.match(image_path.stem)
    if not match:
        return None, None
    day, hour_text, minute_text, second_text, meridiem = match.groups()
    hour = int(hour_text)
    if meridiem.upper() == "PM" and hour < 12:
        hour += 12
    elif meridiem.upper() == "AM" and hour == 12:
        hour = 0
    timestamp = datetime.strptime(
        f"{day} {hour} {minute_text} {second_text}", "%Y-%m-%d %H %M %S"
    )
    return day, timestamp


def read_polygons(label_path: Path, class_count: int) -> list[tuple[int, list[float]]]:
    polygons: list[tuple[int, list[float]]] = []
    for line_number, line in enumerate(label_path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        fields = line.split()
        if len(fields) < 7 or (len(fields) - 1) % 2:
            raise ValueError(
                f"{label_path}:{line_number}: expected class ID and at least 3 (x, y) points"
            )
        try:
            class_id = int(fields[0])
            coordinates = [float(value) for value in fields[1:]]
        except ValueError as error:
            raise ValueError(f"{label_path}:{line_number}: non-numeric annotation") from error
        if not 0 <= class_id < class_count:
            raise ValueError(f"{label_path}:{line_number}: class ID {class_id} is not defined")
        if not all(math.isfinite(value) and 0 <= value <= 1 for value in coordinates):
            raise ValueError(f"{label_path}:{line_number}: coordinates must be normalized to [0, 1]")
        polygons.append((class_id, coordinates))
    if not polygons:
        raise ValueError(f"{label_path}: empty annotations are not expected in this positive-only set")
    return polygons


def make_records(source_root: Path, class_names: list[str]) -> list[ImageRecord]:
    records: list[ImageRecord] = []
    seen_labels: set[Path] = set()
    for split in ("train", "valid", "test"):
        image_dir = source_root / split / "images"
        label_dir = source_root / split / "labels"
        if not image_dir.is_dir() or not label_dir.is_dir():
            raise FileNotFoundError(f"Expected {image_dir} and {label_dir}")
        for image_path in sorted(
            path for path in image_dir.iterdir()
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ):
            label_path = label_dir / f"{image_path.stem}.txt"
            if not label_path.is_file():
                raise FileNotFoundError(f"Missing annotation for {image_path}")
            seen_labels.add(label_path.resolve())
            day, timestamp = capture_time(image_path)
            image_hash = hashlib.sha256(image_path.read_bytes()).hexdigest()
            records.append(
                ImageRecord(
                    image_path=image_path,
                    label_path=label_path,
                    source_split=split,
                    image_hash=image_hash,
                    timestamp_key=day,
                    timestamp=timestamp,
                    polygons=read_polygons(label_path, len(class_names)),
                )
            )
    for split in ("train", "valid", "test"):
        label_dir = source_root / split / "labels"
        orphaned = [
            path for path in label_dir.glob("*.txt")
            if path.resolve() not in seen_labels
        ]
        if orphaned:
            raise ValueError(f"Found {len(orphaned)} labels without matching images in {label_dir}")
    if not records:
        raise ValueError(f"No images found under {source_root}")
    return records


def build_groups(records: list[ImageRecord], gap_seconds: int) -> list[list[int]]:
    union_find = UnionFind(len(records))
    by_day: dict[str, list[int]] = defaultdict(list)
    by_hash: dict[str, list[int]] = defaultdict(list)
    for index, record in enumerate(records):
        by_hash[record.image_hash].append(index)
        if record.timestamp_key and record.timestamp:
            by_day[record.timestamp_key].append(index)

    for indices in by_hash.values():
        for duplicate in indices[1:]:
            union_find.union(indices[0], duplicate)

    for day_indices in by_day.values():
        by_timestamp: dict[datetime, list[int]] = defaultdict(list)
        for index in day_indices:
            timestamp = records[index].timestamp
            assert timestamp is not None
            by_timestamp[timestamp].append(index)
        timestamps = sorted(by_timestamp)
        session_indices: list[int] = []
        previous: datetime | None = None
        for timestamp in timestamps:
            if previous is not None and (timestamp - previous).total_seconds() > gap_seconds:
                for duplicate in session_indices[1:]:
                    union_find.union(session_indices[0], duplicate)
                session_indices = []
            session_indices.extend(by_timestamp[timestamp])
            previous = timestamp
        for duplicate in session_indices[1:]:
            union_find.union(session_indices[0], duplicate)

    components: dict[int, list[int]] = defaultdict(list)
    for index in range(len(records)):
        components[union_find.find(index)].append(index)
    return sorted(
        components.values(),
        key=lambda indices: (
            -len(indices),
            hashlib.sha256("|".join(records[i].image_hash for i in indices).encode()).hexdigest(),
        ),
    )


def assign_splits(
    groups: list[list[int]], total_images: int, seed: int
) -> dict[int, str]:
    del seed  # Group content hashes make the assignment deterministic across runs.
    names = ("train", "val", "test")
    fractions = (0.70, 0.15, 0.15)
    targets = [total_images * fraction for fraction in fractions]
    counts = [0, 0, 0]
    assignments: dict[int, str] = {}
    for group_number, group in enumerate(groups):
        candidates = list(range(len(names)))
        groups_left = len(groups) - group_number
        empty_splits = [index for index, count in enumerate(counts) if count == 0]
        if groups_left <= len(empty_splits):
            candidates = empty_splits
        group_size = len(group)
        chosen = min(
            candidates,
            key=lambda split_index: (
                ((counts[split_index] + group_size - targets[split_index]) / targets[split_index]) ** 2
                + sum(
                    ((counts[i] - targets[i]) / targets[i]) ** 2
                    for i in range(len(names)) if i != split_index
                ),
                counts[split_index] / targets[split_index],
            ),
        )
        for record_index in group:
            assignments[record_index] = names[chosen]
        counts[chosen] += group_size
    return assignments


def convert_polygon_to_box(coordinates: list[float]) -> tuple[float, float, float, float]:
    x_values = coordinates[0::2]
    y_values = coordinates[1::2]
    x_min, x_max = min(x_values), max(x_values)
    y_min, y_max = min(y_values), max(y_values)
    width = x_max - x_min
    height = y_max - y_min
    if width <= 0 or height <= 0:
        raise ValueError("A polygon has zero-area bounds and cannot become a detection box")
    return (
        (x_min + x_max) / 2,
        (y_min + y_max) / 2,
        width,
        height,
    )


def prepare_dataset(
    source_root: Path,
    output_root: Path,
    gap_seconds: int,
    seed: int,
    dry_run: bool,
) -> dict[str, object]:
    source_root = source_root.resolve()
    output_root = output_root.resolve()
    if source_root == output_root or source_root in output_root.parents or output_root in source_root.parents:
        raise ValueError("Source and output directories must be separate, non-nested directories")
    if output_root.exists() and any(output_root.iterdir()):
        raise FileExistsError(
            f"Output directory is not empty: {output_root}. Choose a new path; source data is never overwritten."
        )
    names = parse_class_names(source_root / "data.yaml")
    records = make_records(source_root, names)
    groups = build_groups(records, gap_seconds)
    assignments = assign_splits(groups, len(records), seed)
    split_images = Counter(assignments.values())
    split_boxes: dict[str, int] = Counter()
    class_counts: Counter[int] = Counter()
    manifest_rows: list[dict[str, str]] = []

    for index, record in enumerate(records):
        split = assignments[index]
        split_boxes[split] += len(record.polygons)
        class_counts.update({class_id: count for class_id, count in Counter(
            class_id for class_id, _ in record.polygons
        ).items()})
        unique_name = f"{record.source_split}__{record.image_path.name}"
        manifest_rows.append(
            {
                "prepared_image": unique_name,
                "prepared_split": split,
                "source_split": record.source_split,
                "source_image": record.image_path.name,
                "capture_timestamp": (
                    record.timestamp.isoformat(sep=" ") if record.timestamp else ""
                ),
                "sha256": record.image_hash,
            }
        )
        if dry_run:
            continue
        image_dir = output_root / "images" / split
        label_dir = output_root / "labels" / split
        image_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(record.image_path, image_dir / unique_name)
        label_lines = []
        for _, polygon in record.polygons:
            center_x, center_y, width, height = convert_polygon_to_box(polygon)
            label_lines.append(
                f"0 {center_x:.8f} {center_y:.8f} {width:.8f} {height:.8f}"
            )
        (label_dir / f"{Path(unique_name).stem}.txt").write_text(
            "\n".join(label_lines) + "\n",
            encoding="utf-8",
        )

    report: dict[str, object] = {
        "source": str(source_root),
        "output": str(output_root),
        "dry_run": dry_run,
        "source_images": len(records),
        "polygon_instances": sum(len(record.polygons) for record in records),
        "original_classes": {str(i): name for i, name in enumerate(names)},
        "original_class_instances": {str(key): value for key, value in sorted(class_counts.items())},
        "prepared_class": "date",
        "prepared_class_id": 0,
        "grouping": f"same filename capture-session with <= {gap_seconds}s gaps, plus exact SHA-256 duplicates",
        "group_count": len(groups),
        "split_images": {name: split_images.get(name, 0) for name in ("train", "val", "test")},
        "split_boxes": {name: split_boxes.get(name, 0) for name in ("train", "val", "test")},
        "negative_images": 0,
        "negative_image_warning": (
            "No empty-label images were present in the source; date-free negatives are not included."
        ),
    }
    if not dry_run:
        output_root.mkdir(parents=True, exist_ok=True)
        yaml_dataset_path = output_root.as_posix().replace("'", "''")
        (output_root / "data.yaml").write_text(
            f"path: '{yaml_dataset_path}'\n"
            "train: images/train\n"
            "val: images/val\n"
            "test: images/test\n\n"
            "nc: 1\n"
            "names: ['date']\n",
            encoding="utf-8",
        )
        with (output_root / "manifest.csv").open("w", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(manifest_rows[0].keys()))
            writer.writeheader()
            writer.writerows(manifest_rows)
        (output_root / "preparation_report.json").write_text(
            json.dumps(report, indent=2) + "\n",
            encoding="utf-8",
        )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Roboflow export directory")
    parser.add_argument("--output", type=Path, required=True, help="New prepared dataset directory")
    parser.add_argument("--gap-seconds", type=int, default=60)
    parser.add_argument("--seed", type=int, default=2026)
    parser.add_argument("--dry-run", action="store_true", help="Audit conversion/split without writing files")
    args = parser.parse_args()
    if args.gap_seconds < 0:
        parser.error("--gap-seconds must be non-negative")
    report = prepare_dataset(args.source, args.output, args.gap_seconds, args.seed, args.dry_run)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
