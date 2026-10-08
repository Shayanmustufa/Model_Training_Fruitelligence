# 01 - Setup: Phone Camera over USB (DroidCam)

Goal: the phone acts as a virtual webcam over USB. The React app reads it with `getUserMedia`. **No phone-side code is needed.**

## Architecture

```
Phone (DroidCam app) --USB--> Laptop (DroidCam client = virtual webcam)
                                   |
                        Browser getUserMedia()
                                   |
                     React <CameraFeed /> (live <video>)
                                   |  Capture button -> canvas -> Blob
                                   v
                  POST /api/upload (multipart) -> Node/Express (multer)
```

## Project structure

```
project/
  client/                  # React (Vite)
    src/
      components/CameraFeed.jsx
      App.jsx
  server/
    server.js
    uploads/               # created automatically
```

## Manual setup (done by the human, not the IDE agent)

### Phone and laptop software
1. Install **DroidCam** on the phone (Play Store / App Store).
2. Install the **DroidCam desktop client** on the laptop (dev47apps.com).
   - Windows: installer includes the virtual camera driver and ADB.
   - Linux: needs `v4l2loopback` and `adb` (`sudo apt install adb`).
   - macOS: no official client. Use **Iriun Webcam** or **Camo**; the React code is unchanged.

### Connect over USB
**Android**
1. Settings > About phone > tap **Build number** 7 times.
2. Enable **USB debugging** in Developer options.
3. Plug in a **data-capable** cable, accept the "Allow USB debugging?" prompt.
4. Open DroidCam on the phone and keep it in the foreground.
5. Desktop client > **USB** tab > refresh icon > **Start**.

**iOS**
1. Windows: install iTunes / Apple Devices (USB driver). Linux: `usbmuxd`.
2. Plug in, tap **Trust**.
3. Open DroidCam on the phone, then desktop client > USB tab > **Start**.

### Verify
Open any browser webcam test page. The phone image should appear. Typical device names: `DroidCam Source 3` (Windows), `DroidCam Video` (Linux).

## Install dependencies

```bash
# server
cd server
npm init -y
npm i express multer cors

# client (if not created yet)
npm create vite@latest client -- --template react
cd client && npm i
```

## Run

```bash
# terminal 1
cd server && node server.js      # http://localhost:3001

# terminal 2
cd client && npm run dev         # http://localhost:5173
```

Use `http://localhost` (a secure context) or `getUserMedia` will be blocked.

## Troubleshooting

| Problem | Fix |
|---|---|
| Phone not detected | Try another cable (many are charge-only); run `adb devices` and confirm state is `device`, not `unauthorized` |
| Camera missing in browser list | Start the feed in the DroidCam client first, then reload the page; on Linux check `/dev/video*` |
| Black screen / device in use | Close Zoom, Teams, OBS or other tabs using the camera |
| Permission error | Use `http://localhost`; allow camera in site settings |
| Low resolution | Free DroidCam tier may cap resolution; check current limits |
| Mirrored image | Flip in DroidCam settings, or `transform: scaleX(-1)` on `<video>` (display only; capture stays unmirrored) |
