import base64
import binascii
import json
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials


load_dotenv()


def _initialize_firebase():
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if service_account_json:
        try:
            decoded_json = base64.b64decode(
                service_account_json, validate=True
            ).decode("utf-8")
            service_account_data = json.loads(decoded_json)
            if not isinstance(service_account_data, dict):
                raise ValueError
        except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError, ValueError):
            try:
                service_account_data = json.loads(service_account_json)
            except (json.JSONDecodeError, TypeError):
                raise RuntimeError(
                    "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid raw or "
                    "base64-encoded Firebase service-account JSON"
                ) from None

        if not isinstance(service_account_data, dict):
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON must contain a JSON object"
            )

        try:
            cred = credentials.Certificate(service_account_data)
        except (TypeError, ValueError):
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON is not a valid Firebase "
                "service-account credential"
            ) from None
        return firebase_admin.initialize_app(cred)

    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not service_account_path:
        raise RuntimeError(
            "Firebase credentials are not configured. Set either "
            "FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH."
        )

    if not os.path.exists(service_account_path):
        raise RuntimeError(
            f"Firebase service account file not found: {service_account_path}"
        )

    cred = credentials.Certificate(service_account_path)

    return firebase_admin.initialize_app(cred)


firebase_app = _initialize_firebase()
