# NEKI 랜딩 정적 사이트. 빌드 단계 없이 서빙할 파일만 nginx 이미지에 복사한다.
# 기획 문서(*.md)와 원본 소스(assets/)는 이미지에 넣지 않는다.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY index.html app.html robots.txt sitemap.xml llms.txt /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY img /usr/share/nginx/html/img

EXPOSE 8080
