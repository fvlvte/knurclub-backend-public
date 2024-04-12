FROM python:3.11

WORKDIR /app

COPY ./ /app
RUN rm -rf /app/.venv

RUN pip install -r gowno.pip

ENV BACKEND_BASE="https://camp.knur.club"

EXPOSE 8000
CMD python -m uvicorn --host 0.0.0.0 main:app
