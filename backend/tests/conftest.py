"""
Shared test configuration — credentials loaded from environment.
"""
import os

TEST_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "shyam@sentrixai.com")
TEST_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Sentrix@2024")
