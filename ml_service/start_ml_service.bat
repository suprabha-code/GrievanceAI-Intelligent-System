@echo off
title GrievanceAI ML Service
echo Starting ML Service...
echo This may take a few minutes to download models on first run.
cd /d e:\Grievancee-master\Grievancee-master\ml_service
python predictor.py
pause
