from pydantic import BaseModel


class FormEntry(BaseModel):
    question: str
    value: str


class SaveForm(BaseModel):
    token: str
    captcha: str
    form: list[FormEntry]
