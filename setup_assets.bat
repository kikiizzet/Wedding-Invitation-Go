if not exist "frontend\public" mkdir "frontend\public"
copy /y "zetka.png" "frontend\public\zetka.png"
cd frontend
npm install
