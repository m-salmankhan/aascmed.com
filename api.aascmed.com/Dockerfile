FROM python:3.9

ARG UID="991"
ARG GID="991"

WORKDIR /code
COPY ./requirements.txt /code/
RUN apt-get update && \
    groupadd -g "${GID}" app && \
    useradd -l -u "$UID" -g "${GID}" -m -d /code app && \
    pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY src/ /code/
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

HEALTHCHECK CMD curl --fail http://localhost:8000 || exit 1
