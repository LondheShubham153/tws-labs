printf '      - uses: actions/upload-artifact@v7\n        if: always()\n        with:\n          name: test-reports\n          path: test-results\n' >> shop/.github/workflows/ci.yml
