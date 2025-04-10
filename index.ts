const teste = Bun.serve({
    port: 3000,
    fetch(request) {
        return new Response("Hello World");
    }
})

console.log("Server running on http://localhost:", teste.port);