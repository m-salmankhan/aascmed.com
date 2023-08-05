import os

with open(f"{os.path.dirname(os.path.realpath(__file__))}/contact_form_notification.html", "r") as fh:
    contact_form_notification_template = fh.read()

with open(f"{os.path.dirname(os.path.realpath(__file__))}/new_patient_forms.html", "r") as fh:
    new_patient_forms_template = fh.read()
