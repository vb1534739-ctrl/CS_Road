package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type Health struct {
	Status string `json:"status"`
	App    string `json:"app"`
}

func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func apiMux() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		jsonResponse(w, http.StatusOK, Health{
			Status: "ok",
			App:    "crossy-pets",
		})
	})

	return mux
}

func spaHandler(dist string) http.HandlerFunc {
	fs := http.FileServer(http.Dir(dist))

	return func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		clean := filepath.Clean(r.URL.Path)
		if clean == "." || clean == "/" {
			clean = "/index.html"
		}

		full := filepath.Join(dist, clean)
		if info, err := os.Stat(full); err == nil && !info.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}

		http.ServeFile(w, r, filepath.Join(dist, "index.html"))
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dist := filepath.Join("web", "dist")
	mux := apiMux()
	mux.HandleFunc("/", spaHandler(dist))

	log.Printf("Crossy Pets running on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
