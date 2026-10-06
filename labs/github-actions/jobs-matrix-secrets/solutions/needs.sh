printf '  deploy:\n    needs: [build, test]\n    runs-on: ubuntu-latest\n    steps:\n      - run: ./deploy.sh\n' >> shop/.github/workflows/ci.yml
