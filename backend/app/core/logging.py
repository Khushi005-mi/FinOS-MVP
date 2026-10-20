import logging
import sys

def setup_logging():
    """Configures structured JSON-style logging for FastAPI backend."""
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    logger = logging.getLogger("finos")
    logger.setLevel(logging.INFO)
    return logger

logger = setup_logging()