from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from starlette.responses import JSONResponse
import jwt

from models.TwitchOAuthResponse import TwitchOAuthResponse
import json
import datetime
import os
# TODO: Formularzyk w SQLITE
# import sqlite3

import httpx

try:
    BACKEND_BASE = os.environ["BACKEND_BASE"]
except KeyError:
    BACKEND_BASE = "http://localhost:8000"

with open("./static/rejestracjaEtap2xd.html") as file:
    html2 = file.read().replace('###CVL###', BACKEND_BASE)

# TODO: Dodaj rate limiter deklu.
app = FastAPI()


def make_token(payload: dict) -> str:
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    return jwt.encode(payload, os.getenv('SECRET_KEY'), algorithm='HS256')


def decode_token(token: str) -> dict:
    tk = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
    if tk['exp'] < datetime.datetime.utcnow():
        raise Exception("Token is expired")
    return tk


async def twitch_is_subscribing_to_channel(channel_id: str, user_id: str, token: str) -> bool:
    async with httpx.AsyncClient() as client:
        headers = {
            'Client-Id': os.environ['TWITCH_CLIENT_ID'],
            'Authorization': f'Bearer {token}'
        }
        url = f'https://api.twitch.tv/helix/subscriptions/user?broadcaster_id={channel_id}&user_id={user_id}'
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return True
        elif response.status_code == 404:
            return False
        else:
            raise Exception("Failed to get subscription info")


async def twitch_user_info(token):
    async with httpx.AsyncClient() as client:
        headers = {
            'Client-Id': os.environ['TWITCH_CLIENT_ID'],
            'Authorization': f'Bearer {token}'
        }
        response = await client.get("https://api.twitch.tv/helix/users", headers=headers)
        if response.status_code != 200:
            raise Exception(f"Request failed for reason {response.status_code}: {response.text}")
        return json.loads(response.text)


# TODO: Zweryfikuj deklu czy użyszkodnik ma suba na twoim kanale.
async def twitch_oauth_handler(code, redirect_url):
    async with httpx.AsyncClient() as client:
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {
            "code": code,
            "redirect_uri": redirect_url,
            "client_id": os.environ['TWITCH_CLIENT_ID'],
            "client_secret": os.environ['TWITCH_CLIENT_SECRET'],
            "grant_type": "authorization_code",
        }
        response = await client.post("https://id.twitch.tv/oauth2/token", data=data, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Request failed for reason {response.status_code}: {response.text}")
        return json.loads(response.text)


@app.post("/twitch/oauth")
async def twitch_oauth(request: TwitchOAuthResponse):
    async with httpx.AsyncClient() as client:
        auth = await twitch_oauth_handler(request.code, request.redirect_url)
        data = await twitch_user_info(auth.get("access_token"))

        destructured_data = data["data"][0]

        user_id = destructured_data["id"]

        is_subscribed = await twitch_is_subscribing_to_channel("268563714", user_id, auth.get("access_token"))

        if not is_subscribed:
            return JSONResponse({"error": "not subscribed"}, status_code=403)

        return {"auth": auth, "data": destructured_data,
                "token": make_token({"id": user_id, "username": destructured_data["login"]})}


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("./static/rejestracjaEtap1xd.html") as file:
        return file.read().replace('###CVL###', BACKEND_BASE)


@app.get("/oauth_landing", response_class=HTMLResponse)
async def oauth_landing():
    with open("./static/rejestracjaEtap2xd.html") as file:
        return file.read().replace('###CVL###', BACKEND_BASE)


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
