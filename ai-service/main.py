from fastapi import FastAPI, Query
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

app = FastAPI(title="Fuzzy matcher")
model = SentenceTransformer("all-MiniLM-L6-v2")

class EmbeddingReq(BaseModel):
    texts: list[str]

@app.post("/embeddings")
def embed(req: EmbeddingReq):
    vectors = model.encode(req.texts, convert_to_numpy=True).tolist()
    return {"vectors": vectors}

@app.get("/similar")
def similar(q: str = Query(...), choices: list[str] = Query(...)):
    q_vec = model.encode(q, convert_to_tensor=True)
    c_vec = model.encode(choices, convert_to_tensor=True)
    scores = util.pytorch_cos_sim(q_vec, c_vec)[0].tolist()
    return {"scores": scores}
