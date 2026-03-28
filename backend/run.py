"""Entry point for running the TeleSec backend server."""
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
