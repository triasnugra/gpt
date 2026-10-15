# Optional Firebase adaptation (every minute + Firestore)

This folder is an optional deployment path; it is not used by the GitHub Actions workflow. GitHub Actions scheduled workflows have a minimum interval of 5 minutes. Firebase scheduled functions can use `every 1 minutes`, but scheduling is billed and requires a Blaze billing project / Cloud Scheduler setup. See:
- https://firebase.google.com/docs/functions/schedule-functions
- https://firebase.google.com/docs/firestore/extend-with-functions

## Steps

1. Install Firebase CLI: `npm install -g firebase-tools`
2. `firebase login`
3. Create/select a Firebase project and enable Cloud Firestore.
4. In this folder run `npm install`.
5. Set project: `firebase use --add`.
6. Deploy: `firebase deploy --only functions`.

The Firebase function below expects you to copy the scraper's `src/` folder into `functions/src/` or adapt imports. Firestore collection `signalSnapshots` stores one document per ticker for the latest normalized view. It intentionally does not pretend that the static JSON file is persistent storage.
