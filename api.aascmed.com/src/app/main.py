import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import contact

app = FastAPI()
app.include_router(contact.router)
origins = [os.getenv("HOST")]
print(origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}
