echo "Starting with storing ace-app"
echo "Stopping any straggling containers ..."
docker container stop ace-app
docker container rm --force ace-app
docker image rm --force ace-app
docker image rm --force us-west1-docker.pkg.dev/ace-insights/ace-app

echo "Building Image .."
echo "Setting platforma as linux/amd64"
# docker build -t ace-app .
docker buildx build --platform linux/amd64 -t ace-app .
echo ""

echo "Tagging and pushing to Google-Artifact-Registry"
docker tag ace-app us-west1-docker.pkg.dev/ace-insights/ace-app/ace-app
docker push us-west1-docker.pkg.dev/ace-insights/ace-app/ace-app
echo ""

echo "Deploying ace-app to Cloud-Run"
gcloud  run deploy ace-app \
    --image us-west1-docker.pkg.dev/ace-insights/ace-app/ace-app \
    --add-cloudsql-instances yoptima-nexus:us-west1:yoptima-nexus \
    --allow-unauthenticated \
    --region us-west1 \
    --concurrency 50 \
    --memory 4096Mi \
    --min-instances 0 \
    --max-instances 1 \
    --port 3000 \
    --timeout 1800 \
    --project ace-insights \
    --service-account bigqueryace@ace-insights.iam.gserviceaccount.com \
    # --set-env-vars="GOOGLE_CLIENT_ID=YOUR_CLIENT_ID" \
    # --set-env-vars="GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET" \
    # --set-env-vars="NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET" \
    # --set-env-vars="NEXTAUTH_URL=YOUR_NEXTAUTH_URL" \
    # --set-env-vars="POSTGRES_URL=YOUR_POSTGRES_URL" \
    # --set-env-vars="POSTGRES_USER=YOUR_POSTGRES_USER" \
    # --set-env-vars="POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD" \
    # --set-env-vars="POSTGRES_HOST=YOUR_POSTGRES_HOST" \
    # --set-env-vars="POSTGRES_DATABASE=YOUR_POSTGRES_DATABASE" \
    # --set-env-vars="ACCESS_TOKEN_SECRET=YOUR_ACCESS_TOKEN_SECRET" \
    # --set-env-vars="REFRESH_TOKEN_SECRET=YOUR_REFRESH_TOKEN_SECRET"