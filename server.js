require("dotenv").config();
const express = require("express");
const db = require("./db");

require("./monitor");

const app = express();

const cors=require("cors");
app.use(cors());

app.use(express.json());

app.get("/api/sites", async (req, res) => {
  try {
    const [sites] = await db.query(
      "select * from sites order by created_at desc",
    );
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sites", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startswith("http")) {
    return res
      .status(400)
      .json({
        error: "please provide a valid URL starting with https:// or https://",
      });
  }

  try {
    const [result] = await db.query("insert into sites (url) values(?)", [url]);
    res.status(201).json({ id: result.insertId, url, message: "Site added!" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "This wesbite is already being monitred" });
    }

    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sites/:id/logs", async (req, res) => {
  try {
    const [logs] = await db.query(
      "select * from check_logs where siteid=? order by checked_at desc limit 50",
      [req.params.id],
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete("/api/sites/:id",async(req,res)=>{
    try{
        await db.query("delete from sites where id=?",[req.params.id]);
        res.json({message:"site is deleted"});
    }catch(err){
        res.status(500).json({error:err.message});
    }
})



app.listen(3000, () => {
  console.log("Server & monitoring runnign on https:localhost:3000");
});
