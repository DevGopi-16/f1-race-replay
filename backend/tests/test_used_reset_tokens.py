import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.auth.database import Base
from src.auth.password_reset.used_tokens import is_used, mark_used


class UsedResetTokenTests(unittest.TestCase):
    def test_reset_token_can_only_be_marked_used_once(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)

        with Session(engine) as db:
            jti = "sqlite-reset-token-test"

            self.assertTrue(mark_used(db, jti))
            db.commit()
            self.assertFalse(mark_used(db, jti))
            self.assertTrue(is_used(db, jti))

        engine.dispose()


if __name__ == "__main__":
    unittest.main()
