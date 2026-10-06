sed -i 's/^permissions: write-all/permissions:\n  contents: read/' shop/.github/workflows/broken.yml
sed -i 's|acme/deploy@main|acme/deploy@v2|' shop/.github/workflows/broken.yml
sed -i 's|^      - run: echo .*|      - run: ./release.sh|' shop/.github/workflows/broken.yml
