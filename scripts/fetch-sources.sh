#!/bin/sh
# Prep-time fetch for a state (default TN=47). Outputs to ./cf-data; then run make-state-json.py.
ST=${1:-47}; mkdir -p cf-data/q && cd cf-data
curl -sLO https://www2.census.gov/programs-surveys/saipe/datasets/2023/2023-state-and-county/est23all.txt
curl -sL -o b20002.dat https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/data/5YRData/acsdt5y2023-b20002.dat
curl -sL -o atlas.csv https://opportunityinsights.org/wp-content/uploads/2018/10/county_outcomes_simple.csv
for c in $(grep "^0500000US$ST" b20002.dat | cut -c12-14); do for y in 2019 2024; do
  curl -s -A "Mozilla/5.0" -o q/$y-$c.csv "https://data.bls.gov/cew/data/api/$y/a/area/$ST$c.csv"; sleep 0.2; done; done
