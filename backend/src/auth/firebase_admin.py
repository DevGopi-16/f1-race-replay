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

    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH"
    )

    if not service_account_path:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_PATH is not configured"
        )

    if not os.path.exists(service_account_path):
        raise RuntimeError(
            f"Firebase service account file not found: {service_account_path}"
        )

    cred = credentials.Certificate(service_account_path)

    return firebase_admin.initialize_app(cred)


firebase_app = _initialize_firebase()
