import { useEffect, useState } from "react";

function App() {
    const [msg, setMsg] = useState("Загрузка...");

    useEffect(() => {
        fetch("http://localhost:3000/api/hello")
            .then(r => r.json())
            .then(d => setMsg(d.message))
            .catch(() => setMsg("Ошибка соединения с C++ сервером"));
    }, []);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "system-ui"
        }}>
            <h1>{msg}</h1>
        </div>
    );
}

export default App;