# Model Files

Place your trained joblib artifacts here:

- `model.joblib` (required): your classifier with either `predict_proba` or `decision_function`
- `scaler.joblib` (optional): if your training used scaling
- `metadata.json` (optional but recommended): label order + feature/window parameters

If `model.joblib` is missing, the API will return an error.

