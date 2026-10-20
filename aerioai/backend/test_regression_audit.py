from core.database import init_db, SessionLocal
from api.chat import _build_system_context
from services.chat_service import GroqService
from services.gemini_service import GeminiService
from services.fc_service import FlightControllerService

def test_all():
    print("==================================================")
    print("AERIOAI PHASE 1 REGRESSION & RELIABILITY TEST SUITE")
    print("==================================================")

    # 1. Initialize tables and test Mode-Specific Context Building
    init_db()
    db = SessionLocal()

    modes = ["surveillance", "search_rescue", "agriculture", "inspection"]
    for m in modes:
        ctx = _build_system_context(db, user_id=1, mission_mode=m)
        assert m.upper() in ctx, f"Failed: {m} not in context"
        print(f"✓ Context for {m.upper()}: verified")

    # 2. Test Groq Mode-Specific System Prompts
    groq = GroqService()
    for m in modes:
        prompt = groq._get_mission_system_prompt(m)
        assert len(prompt) > 50, f"Failed: prompt too short for {m}"
        if m == "search_rescue":
            assert "Search & Rescue" in prompt
        elif m == "agriculture":
            assert "Agronomy" in prompt or "agriculture" in prompt.lower()
        elif m == "inspection":
            assert "Inspection" in prompt or "structural" in prompt.lower()
        elif m == "surveillance":
            assert "Surveillance" in prompt
        print(f"✓ Groq System Prompt for {m.upper()}: verified")

    # 3. Test Gemini Mock & Mode-Specific Analysis
    gemini = GeminiService()
    for m in modes:
        analysis = gemini._mock_analysis(mission_mode=m)
        assert "summary" in analysis
        assert "objects" in analysis
        assert "threat_level" in analysis
        print(f"✓ Gemini Analysis for {m.upper()}: '{analysis['summary'][:50]}...'")

    # 4. Test Flight Controller Telemetry and Trajectory
    fc = FlightControllerService()
    t = fc.get_telemetry()
    assert "source" in t, "Missing 'source' in telemetry"
    assert "is_simulated" in t, "Missing 'is_simulated' in telemetry"
    print(f"✓ Telemetry Source: {t['source']}, Simulated: {t['is_simulated']}")

    traj = fc.get_trajectory()
    assert "points" in traj, "Missing 'points' in trajectory"
    # 5. Test Mode Chat History Isolation
    from core.models import LiveAnalysisLog, User
    
    # Clean previous test entries
    db.query(LiveAnalysisLog).filter(LiveAnalysisLog.user_id == 999).delete()
    db.commit()

    # Insert a surveillance log and an agriculture log
    db.add(LiveAnalysisLog(user_id=999, role="user", message="SURVEILLANCE_SECRET_CODE", context="groundstation_surveillance"))
    db.add(LiveAnalysisLog(user_id=999, role="user", message="AGRICULTURE_CROP_CODE", context="groundstation_agriculture"))
    db.commit()

    agri_ctx = _build_system_context(db, user_id=999, mission_mode="agriculture")
    assert "AGRICULTURE_CROP_CODE" in agri_ctx, "Agriculture log missing in agriculture context"
    assert "SURVEILLANCE_SECRET_CODE" not in agri_ctx, "Surveillance log leaked into agriculture context!"
    print("✓ Mode Chat History Isolation: verified (No cross-mode message leakage)")

    surv_ctx = _build_system_context(db, user_id=999, mission_mode="surveillance")
    assert "SURVEILLANCE_SECRET_CODE" in surv_ctx, "Surveillance log missing in surveillance context"
    assert "AGRICULTURE_CROP_CODE" not in surv_ctx, "Agriculture log leaked into surveillance context!"
    print("✓ Surveillance Chat History Isolation: verified")

    # 6. Test Startup Announcement Original Wording
    from api.chat import get_startup_announcement
    test_user = User(id=999, username="test_pilot", email="test@aerioai.com", role="operator")
    ann = get_startup_announcement(mission_mode="surveillance", current_user=test_user)
    assert "System is starting. Drone motors configuring." in ann["text"], f"Original wording missing: {ann['text']}"
    print(f"✓ Startup Announcement Wording: verified ('{ann['text'][:60]}...')")

    # 7. Test Empty Audio Rejection
    empty_res = groq.transcribe_audio(b"")
    assert empty_res is None, "Empty audio was not safely rejected"
    small_res = groq.transcribe_audio(b"12345")
    assert small_res is None, "Small audio (<100b) was not safely rejected"
    print("✓ Audio Buffer Validation: verified")

    print("\nALL BACKEND REGRESSION AUDIT CHECKS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_all()
