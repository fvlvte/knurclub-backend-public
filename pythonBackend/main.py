from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from starlette.responses import JSONResponse
import jwt
import time

from models.TwitchOAuthResponse import TwitchOAuthResponse
from models.SaveForm import SaveForm
import json
import datetime
import os
import pymongo

import httpx

ALLOWED_QUESTIONS = [
    "Jak oceniasz swój poziom wiedzy niskopoziomowej (technologie: C/ASM)",
    "Jak oceniasz swój poziom wiedzy z systemów Unix (stack sieciowy, threading, memory)",
    "Dlaczego chcesz się zapisać",
    "Co chcesz osiągnąć jako absolwet knurcamp",
    "Jakbyś był zwierzęciem to jakim byś był zwierzęciem za 5 lat w naszej firmie",
    "Opisz swoje doświadczenia z branżą IT (czy lizłeś np. zagadnienia computer science)",
    "Co oczekujesz się nauczyć na tym campie?",
]

SCALE_QUESTIONS = [
    "Jak oceniasz swój poziom wiedzy niskopoziomowej (technologie: C/ASM)",
    "Jak oceniasz swój poziom wiedzy z systemów Unix (stack sieciowy, threading, memory)",
]

QUESTION_AMOUNT = len(ALLOWED_QUESTIONS)

MAX_ANSWER_LEN = 4096

client = pymongo.MongoClient("localhost", 27017)

try:
    BACKEND_BASE = os.environ["BACKEND_BASE"]
except KeyError:
    BACKEND_BASE = "http://localhost:8000"

with open("./static/rejestracjaEtap2xd.html") as file:
    html2 = file.read().replace('###CVL###', BACKEND_BASE)

app = FastAPI()


def make_token(payload: dict) -> str:
    payload["exp"] = int(time.time()) + 24 * 60 * 60
    return jwt.encode(payload, os.getenv('SECRET_KEY'), algorithm='HS256')


def decode_token(token: str) -> dict:
    tk = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
    if tk['exp'] < int(time.time()):
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


async def captcha_verify(token: str) -> bool:
    async with httpx.AsyncClient() as client:
        data = {
            "secret": os.getenv('CAPTCHA_SECRET'),
            "response": token,
        }
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
        url = 'https://www.google.com/recaptcha/api/siteverify'
        response = await client.post(url, data=data, headers=headers)
        if response.status_code == 200:
            return response.json()['success']
        else:
            return False


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


def get_form(user_id: str) -> dict | None:
    db = client.get_database('knurcamp')
    zapisy = db.get_collection('zapisy')
    return zapisy.find_one({"user_id": user_id})


def save_form(form: dict) -> None:
    db = client.get_database('knurcamp')
    zapisy = db.get_collection('zapisy')

    zapisy.delete_many({"user_id": form["user_id"]})

    zapisy.insert_one(form)


@app.post("/twitch/oauth")
async def twitch_oauth(request: TwitchOAuthResponse):
    if await captcha_verify(request.captcha) is not True:
        return JSONResponse({"error": "wrong captcha"}, status_code=403)

    auth = await twitch_oauth_handler(request.code, request.redirect_url)
    data = await twitch_user_info(auth.get("access_token"))

    destructured_data = data["data"][0]

    user_id = destructured_data["id"]

    is_subscribed = await twitch_is_subscribing_to_channel("268563714", user_id, auth.get("access_token"))

    if get_form(user_id) is not None:
        form = True
    else:
        form = False

    if not is_subscribed:
        return JSONResponse({"error": "not subscribed"}, status_code=403)

    return {
        "auth": auth,
        "data": destructured_data,
        "form": form,
        "token": make_token({"id": user_id, "username": destructured_data["login"]})
    }


@app.post("/save")
async def twitch_oauth(request: SaveForm):
    if await captcha_verify(request.captcha) is not True:
        return JSONResponse({"error": "wrong captcha"}, status_code=403)
    tokenData = decode_token(request.token)

    id = tokenData["id"]
    username = tokenData["username"]

    formData = {}

    for x in request.form:
        if x.question not in ALLOWED_QUESTIONS:
            return JSONResponse({"error": "wypierdalaj skriptkidosie obsrany"}, status_code=400)
        if x.question in SCALE_QUESTIONS:
            if int(x.value) not in range(0, 100):
                return JSONResponse({"error": "wypierdalaj skriptkidosie obsrany"}, status_code=400)
        if len(x.question) > MAX_ANSWER_LEN:
            return JSONResponse({"error": "za dluga maczuga"}, status_code=400)
        formData[x.question] = x.value

    save_form({
        "user_id": id,
        "username": username,
        "form": formData,
    })

    return {"ok": "ok"}


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("./static/rejestracjaEtap1xd.html") as file:
        return file.read().replace('###CVL###', BACKEND_BASE)


@app.get("/oauth_landing", response_class=HTMLResponse)
async def oauth_landing():
    with open("./static/rejestracjaEtap2xd.html") as file:
        return file.read().replace('###CVL###', BACKEND_BASE)


@app.get("/formularzyk", response_class=HTMLResponse)
async def oauth_landing():
    with open("./static/formularzyk.html") as file:
        return file.read()
