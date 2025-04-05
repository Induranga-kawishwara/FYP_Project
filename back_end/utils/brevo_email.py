import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from config import Config

def send_email_via_brevo(to_email, subject, html_content, text_content):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = Config.BREVO_API_KEY

    api_client = sib_api_v3_sdk.ApiClient(configuration)
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(api_client)
    
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        sender={"email": Config.EMAIL_FROM},
        to=[{"email": to_email}],
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )

    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        return api_response
    except ApiException as e:
        raise Exception(f"Error sending email via Brevo: {e}")
