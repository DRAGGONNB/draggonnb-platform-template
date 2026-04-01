-- Elijah Module: WhatsApp Integration Tables

-- Raw inbound WhatsApp messages
CREATE TABLE elijah_whatsapp_inbound (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_phone text NOT NULL,
  message_body text,
  wa_message_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elijah_whatsapp_inbound_message_unique UNIQUE (wa_message_id)
);

-- WhatsApp session state for multi-step command flows (REPORT, FIRE)
CREATE TABLE elijah_whatsapp_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  command text NOT NULL, -- e.g. 'REPORT', 'FIRE'
  step integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}', -- partial data collected so far
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_elijah_whatsapp_inbound_org ON elijah_whatsapp_inbound(organization_id);
CREATE INDEX idx_elijah_whatsapp_inbound_phone ON elijah_whatsapp_inbound(from_phone, received_at DESC);
CREATE INDEX idx_elijah_whatsapp_session_phone ON elijah_whatsapp_session(phone, expires_at);
CREATE INDEX idx_elijah_whatsapp_session_org ON elijah_whatsapp_session(organization_id);
