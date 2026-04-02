from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    COMPLIANCE_OFFICER = "compliance_officer"
    ANALYST = "analyst"
    READ_ONLY_AUDITOR = "read_only_auditor"

class OnboardingStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"

class CDDTier(str, Enum):
    SDD = "sdd"
    STANDARD = "standard_cdd"
    EDD = "edd"

class CDDStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    EXPIRED = "expired"
    REQUIRES_EDD = "requires_edd"
    EDD_IN_PROGRESS = "edd_in_progress"
    EDD_COMPLETE = "edd_complete"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNACCEPTABLE = "unacceptable"

class ScreeningStatus(str, Enum):
    NO_MATCH = "no_match"
    POTENTIAL_MATCH = "potential_match"
    CONFIRMED_MATCH = "confirmed_match"
    FALSE_POSITIVE = "false_positive"

class CasePriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class CaseStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    ESCALATED = "escalated"
    PENDING_INFO = "pending_info"
    CLOSED = "closed"

class CaseType(str, Enum):
    SANCTIONS = "sanctions"
    PEP = "pep"
    ADVERSE_MEDIA = "adverse_media"
    EDD_REQUIRED = "edd_required"
    CDD_EXPIRED = "cdd_expired"
    TRANSACTION_ALERT = "transaction_alert"
    MANUAL_REVIEW = "manual_review"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: UserRole
    tenant_id: str
    totp_secret: Optional[str] = None
    totp_enabled: bool = False
    backup_codes: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    tenant_id: str
    role: UserRole = UserRole.ANALYST

class TOTPSetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]

class TOTPVerifyRequest(BaseModel):
    token: str

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    customer_type: str  # individual or corporate
    status: OnboardingStatus
    risk_score: int = 0
    risk_level: RiskLevel = RiskLevel.LOW
    cdd_tier: CDDTier = CDDTier.STANDARD
    cdd_status: CDDStatus = CDDStatus.NOT_STARTED
    cdd_review_date: Optional[str] = None
    cdd_expiry_date: Optional[str] = None
    screening_status: ScreeningStatus = ScreeningStatus.NO_MATCH
    pep_status: Optional[str] = None
    sanctions_status: ScreeningStatus = ScreeningStatus.NO_MATCH
    adverse_media_status: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: str

class IndividualCustomerData(BaseModel):
    full_name: str
    date_of_birth: str
    nationality: str
    country_of_residence: str
    city: str
    occupation: str
    employer_name: Optional[str] = None
    source_of_funds: str
    source_of_wealth: str
    purpose_of_relationship: str
    is_pep: bool = False
    pep_details: Optional[str] = None

class CorporateCustomerData(BaseModel):
    company_legal_name: str
    trading_name: Optional[str] = None
    registration_number: str
    jurisdiction: str
    date_of_incorporation: str
    registered_address: str
    operating_address: Optional[str] = None
    business_type: str
    industry_sector: str
    source_of_funds: str
    nature_of_business: str
    directors: List[Dict[str, Any]] = []
    ubos: List[Dict[str, Any]] = []

class RiskScoreBreakdown(BaseModel):
    country_risk: int = 0
    occupation_risk: int = 0
    product_risk: int = 0
    delivery_channel_risk: int = 0
    pep_risk: int = 0
    sanctions_risk: int = 0
    adverse_media_risk: int = 0
    transaction_risk: int = 0
    cdd_risk: int = 0
    total: int = 0

class Case(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    case_id: str
    tenant_id: str
    customer_id: str
    customer_name: str
    case_type: CaseType
    priority: CasePriority
    status: CaseStatus
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    sar_filed: bool = False
    sar_reference: Optional[str] = None
    sar_filed_date: Optional[str] = None
    disposition: Optional[str] = None
    disposition_note: Optional[str] = None
    created_at: str
    updated_at: str
    created_by: str
    closed_at: Optional[str] = None
    closed_by: Optional[str] = None

class CaseComment(BaseModel):
    id: str
    case_id: str
    author_id: str
    author_name: str
    author_role: str
    comment: str
    created_at: str

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    timestamp: str
    user_id: str
    user_name: str
    user_role: str
    ip_address: str
    action_type: str
    module: str
    record_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_name: str
    primary_contact: EmailStr
    subscription_plan: str  # starter, growth, enterprise
    customer_limit: int
    customer_count: int = 0
    is_active: bool = True
    created_at: str
    settings: Dict[str, Any] = {}

class SubscriptionPlan(BaseModel):
    id: str
    name: str
    customer_limit: int
    price: float
    stripe_price_id: Optional[str] = None

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    user_id: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: str