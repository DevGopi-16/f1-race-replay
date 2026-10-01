from src.auth.database import Base, engine
from src.auth import models as _user_models
from src.auth.password_reset import models as _password_reset_models
from src.auth.refresh_tokens import models as _refresh_token_models
from src.auth.replay_history import ReplayHistory as _replay_history_model


def main() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    main()
