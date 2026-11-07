from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, client=("203.0.113.7", 50000))


def test_security_headers_present():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "default-src 'none'" in r.headers["content-security-policy"]


def test_cors_rejects_foreign_origin_preflight():
    r = client.options(
        "/api/medications/levothyrox-50/pharmacies/00000000-0000-4000-8000-000000000001/reports",
        headers={
            "Origin": "https://attacker-controlled-site.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert "access-control-allow-origin" not in r.headers


def test_view_logging_requires_client_marker():
    fake = MagicMock()
    with patch("app.routers.medications.get_supabase", return_value=fake):
        r = client.post("/api/medications/levothyrox-50/views")
        assert r.status_code == 204
        fake.rpc.assert_not_called()

        r = client.post(
            "/api/medications/levothyrox-50/views", headers={"X-Mawjoud-Client": "web"}
        )
        assert r.status_code == 204
        fake.rpc.assert_called_once()


def test_patient_cannot_send_unsure_or_extra_fields():
    path = "/api/medications/levothyrox-50/pharmacies/00000000-0000-4000-8000-000000000001/reports"
    assert client.post(path, json={"status": "unsure"}).status_code == 422
    assert client.post(path, json={"status": "in_stock", "reported_by": "pharmacist"}).status_code == 422


def test_non_ip_socket_peer_does_not_500():
    odd = TestClient(app)  # peer host is "testclient", not an IP
    fake = MagicMock()
    with patch("app.routers.medications.get_supabase", return_value=fake):
        r = odd.post("/api/medications/levothyrox-50/views", headers={"X-Mawjoud-Client": "web"})
    assert r.status_code == 204
    _, kwargs = fake.rpc.call_args
    assert fake.rpc.call_args.args[1]["p_fingerprint"] is None
