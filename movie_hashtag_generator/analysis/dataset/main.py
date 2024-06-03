import logging

import requests
import gzip
import shutil
import os

logger = logging.getLogger(__name__)

datasets = {
    "name.basics.tsv.gz": "https://datasets.imdbws.com/name.basics.tsv.gz",
    "title.akas.tsv.gz": "https://datasets.imdbws.com/title.akas.tsv.gz",
    "title.basics.tsv.gz": "https://datasets.imdbws.com/title.basics.tsv.gz",
    "title.crew.tsv.gz": "https://datasets.imdbws.com/title.crew.tsv.gz",
    "title.episode.tsv.gz": "https://datasets.imdbws.com/title.episode.tsv.gz",
    "title.principals.tsv.gz": "https://datasets.imdbws.com/title.principals.tsv.gz",
    "title.ratings.tsv.gz": "https://datasets.imdbws.com/title.ratings.tsv.gz"
}

output_dir = 'imdb_datasets'
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def download_and_extract(url, output_path, extracted_path):
    logger.info(f"Downloading {url}...")
    response = requests.get(url, stream=True)
    with open(output_path, 'wb') as file:
        shutil.copyfileobj(response.raw, file)

    logger.info(f"Extracting {output_path}...")
    with gzip.open(output_path, 'rb') as f_in:
        with open(extracted_path, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    logger.info(f"Extracted to {extracted_path}")

# 모든 데이터셋 다운로드 및 추출
for file_name, url in datasets.items():
    output_path = os.path.join(output_dir, file_name)
    extracted_path = os.path.join(output_dir, file_name.replace('.gz', ''))
    download_and_extract(url, output_path, extracted_path)

print("All files downloaded and extracted.")
