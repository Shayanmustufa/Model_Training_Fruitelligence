## Minutes of Meeting (MoM)

## EarthRenewal.AI

Meeting with Sir Sameer, Sir Ahmed, and Sir Murad

## 1. Tasks with Deadline of 10 October 2026

First draft: 8 October 2026 Final submission: 10 October 2026

## 1.1 Web Application

- The web application will be divided into two sections:

- The left side will display the scrollable web application.

- The right side will display the camera screen and the classification results.

- The following updates will be made to the left side:

- In the "Set Health Profile" option, add a pop-up that prevents the user from using the classification feature until the Health Profile has been completed and saved.

- Add a language drop-down menu to switch between English, Urdu, and Arabic.

- Add the dataset collection video.

- The following updates will be made to the right side:

- Add a bounding box around the date.

- In the "Nutritional Values - per 100 g" section, display the classification report. All nutritional values should remain within defined ranges, implemented using upper and lower bounds for the existing values.

- Provide multiple images to improve classification accuracy.

- Update the web application's README.md file.

## 2. Tasks with Deadlines After 10 October 2026

- Develop a pipeline/framework for the Fruitelligence architecture. The main objective is to create a framework in which the type of annotation used in a dataset is specified, after which a Python script can be executed to train and test the dataset. The framework should support datasets with different annotation types.

- Address the class-imbalance issue (e.g., for the Kalmi class):

- Provide a warning when class imbalance is detected.

- Provide approaches for addressing class imbalance.

- Address the following dataset-related issues:

- The self-collected dates dataset contains images of old dates that are not of good quality.

- The non-date dataset has strong constraints.

- Address deployment-related issues.

- Add a drop-down menu in the web application that allows the user to select any preferred model for date classification.

- Research and identify a solution to the forgetting issue encountered when a model is retrained after a dataset has been extended with additional data or folders.
