# Local CVAT Workflow for Date Detection

This workflow prepares the existing variety-classification images for a
separate, one-class date detector. CVAT runs locally; do not upload the dataset
to a hosted annotation service.

## Dataset audit

The current `dates_dataset/` folder contains 2,163 JPG images (about 12.17 GB /
11.33 GiB). The variety directory is useful metadata, but the detector should
use a single `date` class rather than eight variety classes.

| Variety | Individual | Cluster hand | Cluster surface | Total |
| --- | ---: | ---: | ---: | ---: |
| Ajwa | 266 | 10 | 27 | 303 |
| Amber | 208 | 20 | 20 | 248 |
| Kalmi | 192 | 9 | 40 | 241 |
| Mabroom | 225 | 11 | 36 | 272 |
| Mazafati | 225 | 30 | 52 | 307 |
| Rabbi | 198 | 0 | 11 | 209 |
| Sagai | 227 | 22 | 35 | 284 |
| Zahedi | 230 | 21 | 48 | 299 |
| **Total** | **1,771** | **123** | **269** | **2,163** |

The actual directory name is `cluster_hand` (singular). The folder structure
provides variety labels but no explicit negative examples; add negative camera
frames with no dates before training. The cluster-hand subset is small, and
Rabbi has no cluster-hand examples.
Collect additional examples for those conditions and for camera-like lighting,
distance, backgrounds, and blur. Augmentation alone will not replace missing
scene diversity.

## 1. Install and start CVAT locally

On Windows, install Docker Desktop with its WSL 2 backend and Git, then follow
the current [CVAT Windows installation guide](https://docs.cvat.ai/docs/administration/community/basics/installation/).
The Docker CLI was not available in this workspace during the audit.

From a WSL 2 terminal, use CVAT's documented Docker Compose setup:

```bash
git clone https://github.com/cvat-ai/cvat.git
cd cvat
docker compose up -d
docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
```

Open `http://localhost:8080` in Chrome and sign in with the account just created.
Keep CVAT local; do not expose the service to a public network.

## 2. Create a pilot project and tasks

1. Create a project named `Date Detector`.
2. Add exactly one label: `date`. Use rectangle/bounding-box annotations; do
   not create separate labels for Ajwa, Amber, Kalmi, or other varieties.
3. Start with a small pilot from each available capture type:
   `individual`, `cluster_hand`, and `cluster_surface`. Include multiple
   varieties in the pilot where possible. Use separate tasks for the three
   capture types so annotation progress and quality can be reviewed by scene
   type.
4. Check the pilot export before annotating the rest. Confirm image paths remain
   unique and labels use `date` as class ID 0.

The full source set is about 12.17 GB before CVAT's working copy/export. Begin
with the pilot, check available disk space, and process the remaining images in
manageable batches rather than making an unnecessary second full-size archive.
Keep CVAT exports outside the application source tree (or in an ignored data
location); never overwrite the original `dates_dataset/`.

See CVAT's [task creation guide](https://docs.cvat.ai/docs/workspace/tasks-page/#how-to-create-and-configure-an-annotation-task/)
for the current UI flow.

## 3. Annotation rules

- Draw one tight rectangle around **each individually visible date**. A cluster
  of six visible dates gets six `date` boxes, even when boxes touch or overlap.
  Do not draw one rectangle around the whole cluster; the frontend will merge
  all accepted date detections into the single displayed union box.
- Include the visible portion of a date cut off by the image edge. For
  occlusion, annotate a date only when it is visually identifiable; do not
  invent a hidden boundary.
- Annotate every visible date in the image, not only the sharpest or largest
  one. Do not annotate hands, plates, shadows, highlights, or background
  objects.
- Add real no-date camera frames to the project as negative examples and leave
  them without boxes. Include difficult negatives, such as date-like objects
  and common backgrounds from the intended live-feed environment.
- Keep variety and capture-type information in the source path or a separate
  manifest. They are not detection classes.

## 4. Review and export

1. Review the pilot with a second pass: check missed small/partly occluded dates,
   oversized boxes, inconsistent overlap handling, and accidental background
   labels. Fix the annotation instructions before scaling up.
2. Continue annotation in capture-type batches. Re-check a sample from each
   variety and capture type, with extra attention to the small cluster-hand
   subset.
3. Export each completed task/project using CVAT's `YOLO 1.1` format, including
   images and bounding-box annotations. CVAT's [YOLO format reference](https://docs.cvat.ai/docs/dataset_management/formats/format-yolo/)
   describes the export layout.
4. Verify each exported image has a matching annotation file; each non-empty
   line must contain class ID `0` and normalized `center_x center_y width height`
   values in the `[0, 1]` range. Negative images must have no boxes. Keep a
   separate held-out test set.
5. Split by original capture/session or related filename sequence, not by
   randomly scattering near-duplicate shots across train and validation. Add
   additional live-camera clips to the held-out test set; the current still-image
   folders alone cannot establish live-feed accuracy or temporal stability.

## Handoff to model and frontend work

After the labels pass review, train a one-class object detector with class
`date`, evaluate it on the held-out data, and export an ONNX model whose input
and output contract is verified against the browser inference hook. In the
frontend, filter detections, merge all accepted boxes into one clamped union
rectangle, and stabilize that rectangle over time. Do not treat the current
mock fallback box as a model prediction.

No annotations, training, or model files are generated by this guide.
