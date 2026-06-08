/**
 * Power Automate Notifications Config
 * ─────────────────────────────────────
 * HOW TO SET UP (takes ~5 minutes):
 *
 * 1. Go to make.powerautomate.com and sign in with your @maruti.co.in account
 *
 * 2. Click "Create" → "Instant cloud flow" → name it "Matrix Reminders"
 *    → choose trigger "When an HTTP request is received" → Create
 *
 * 3. In the trigger card, click "Use sample payload to generate schema"
 *    and paste this JSON, then click Done:
 *    {
 *      "to_email": "user@maruti.co.in",
 *      "subject": "Matrix Reminder",
 *      "html_body": "<p>Hello</p>"
 *    }
 *
 * 4. Click "+ New step" → search "Send an email" → pick "Send an email (V2)"
 *    from the Office 365 Outlook connector
 *
 * 5. Fill in the email action:
 *    To      → click in field → Expression → triggerBody()?['to_email']  → OK
 *    Subject → click in field → Expression → triggerBody()?['subject']   → OK
 *    Body    → click in field → Expression → triggerBody()?['html_body'] → OK
 *    Then click "Show advanced options" → set "Is HTML" = Yes
 *
 * 6. Click Save, then click on the trigger card and copy the "HTTP POST URL"
 *
 * 7. Paste that URL as the value of powerAutomateUrl below
 */
window.NOTIFICATIONS_CONFIG = {
  powerAutomateUrl: 'https://defaultd78a821841354026a3a81cdd7223b4.d5.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/ebf3659eb49a458289d8d507087eeaa5/triggers/manual/paths/invoke?api-version=1'
};
