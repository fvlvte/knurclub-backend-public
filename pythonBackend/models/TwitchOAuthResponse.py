from pydantic import BaseModel


class TwitchOAuthResponse(BaseModel):
    code: str
    redirect_url: str
