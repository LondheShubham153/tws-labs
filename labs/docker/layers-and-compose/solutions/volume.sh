printf 'services:\n  web:\n    image: node:22-alpine\n  db:\n    image: postgres:17\n    volumes:\n      - dbdata:/var/lib/postgresql/data\nvolumes:\n  dbdata:\n' > compose.yaml
