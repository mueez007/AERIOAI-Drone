import sqlite3

db_path = "aerioai.db"

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE live_analysis_logs ADD COLUMN session_id VARCHAR;")
        print("Added session_id column.")
    except sqlite3.OperationalError as e:
        print(f"session_id column might already exist: {e}")

    try:
        cursor.execute("ALTER TABLE live_analysis_logs ADD COLUMN context VARCHAR DEFAULT 'ai_chat';")
        print("Added context column.")
    except sqlite3.OperationalError as e:
        print(f"context column might already exist: {e}")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
