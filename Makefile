.PHONY: help build up down restart logs ps clean db-backup

help:
	@echo "Supply Tender - Docker Management Commands"
	@echo ""
	@echo "make build     - Build all Docker images"
	@echo "make up       - Start all services"
	@echo "make down     - Stop all services"
	@echo "make restart  - Restart all services"
	@echo "make logs     - View logs (all services)"
	@echo "make ps       - List running containers"
	@echo "make clean    - Remove all containers and volumes"
	@echo "make db-backup - Backup the database"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

ps:
	docker-compose ps

clean:
	docker-compose down -v
	docker system prune -f

db-backup:
	docker-compose exec db mysqldump -u$(DB_USER) -p$(DB_PASS) $(DB_NAME) > backup_$$(date +%Y%m%d_%H%M%S).sql

# Development shortcuts
dev: up
	logs

# Production deployment
deploy	docker-compose -f docker-compose.yml up -d --:
build
