---
phase: 07-testing-hardening
plan: 01
subsystem: testing
tags: [vitest, unit-tests, payfast, payment-security, test-infrastructure]
requires: [phase-01]
provides:
  - vitest-test-framework
  - payfast-signature-validation-tests
  - test-directory-structure
affects: [phase-07-02]
tech-stack:
  added:
    - vitest@4.0.18
    - '@testing-library/react@16.3.2'
    - '@testing-library/jest-dom@6.9.1'
    - next-test-api-route-handler@5.0.3
  patterns:
    - vitest-next-js-configuration
    - environment-matching-for-node-jsdom
    - test-vectors-with-precomputed-hashes
key-files:
  created:
    - vitest.config.ts
    - vitest.setup.ts
    - __tests__/fixtures/payfast-vectors.ts
    - __tests__/unit/lib/payments/payfast.test.ts
    - __tests__/fixtures/.gitkeep
  modified:
    - package.json (added test scripts)
decisions:
  - decision: Use Vitest over Jest
    rationale: 10-20x faster, better ESM support, Vite-native
    alternatives: [Jest]
  - decision: Environment matching by glob pattern
    rationale: API/lib tests need Node crypto, components need jsdom
    implementation: environmentMatchGlobs in vitest.config.ts
  - decision: Pre-compute test vector signatures
    rationale: Tests validate against known MD5 hashes for determinism
    implementation: Compute signatures in fixtures file at definition time
metrics:
  duration: 6min
  tasks: 2/2
  tests_added: 15
  test_files: 1
  coverage_setup: yes
completed: 2026-02-05
---

# Phase 07 Plan 01: Test Framework Setup Summary

**One-liner:** Vitest test infrastructure established with 15 passing PayFast signature unit tests covering generation and validation with known MD5 test vectors.

## What Was Built

### Test Infrastructure
**Vitest configuration for Next.js 14 App Router:**
- Created `vitest.config.ts` with:
  - React plugin for JSX/TSX support
  - tsconfigPaths plugin for `@/` path aliases
  - Environment matching: jsdom for components, Node for API/lib tests
  - Coverage configuration (v8 provider, includes lib/ and app/api/)
  - Environment variable loading via loadEnvConfig

**Test setup:**
- Created `vitest.setup.ts` with:
  - Environment variable loading from .env files
  - jest-dom matchers for DOM assertions
  - beforeEach mock cleanup with vi.clearAllMocks()

**Package.json scripts:**
- `npm test` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run with coverage report
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests

**Directory structure:**
```
__tests__/
├── fixtures/           # Test data and mocks
├── unit/
│   └── lib/
│       └── payments/   # PayFast tests
└── integration/
    ├── api/            # API route tests
    └── middleware/     # Middleware tests
```

### PayFast Signature Tests

**Test vectors created:**
1. **withoutPassphrase** - Basic payment form (1500.00, Starter Plan)
2. **withPassphrase** - Payment with passphrase (3500.00, Professional Plan)
3. **itnValidation** - ITN payload with full fields
4. **specialChars** - Special characters in values (URL encoding test)

**Test coverage (15 tests):**

**generatePayFastSignature (6 tests):**
- ✅ Generates correct MD5 signature without passphrase
- ✅ Generates correct MD5 signature with passphrase
- ✅ Excludes signature field from hash calculation
- ✅ Handles special characters in values (URL encoding)
- ✅ Generates different signatures for different data
- ✅ Generates different signatures with and without passphrase

**validatePayFastSignature (7 tests):**
- ✅ Returns true for valid signature without passphrase
- ✅ Returns true for valid signature with passphrase
- ✅ Returns false for invalid signature
- ✅ Returns false when signature is missing
- ✅ Returns false when passphrase is incorrect
- ✅ Validates ITN payload correctly
- ✅ Returns false when data is tampered after signing

**Signature determinism (2 tests):**
- ✅ Generates same signature for same input (deterministic)
- ✅ Is case-sensitive

## Verification Results

✅ **TEST-01 satisfied:** PayFast signature validation has unit tests with known test vectors
✅ Vitest runs without configuration errors
✅ All PayFast signature tests pass (15/15)
✅ Test framework ready for additional tests (07-02)

**Test execution:**
```
npm test -- --run
✓ __tests__/unit/lib/payments/payfast.test.ts (15 tests) 71ms
Test Files  1 passed (1)
Tests       15 passed (15)
Duration    4.45s
```

## Next Phase Readiness

**Ready for 07-02 (Auth middleware + CRM API tests):**
- ✅ Vitest configured with environment matching
- ✅ Test directory structure in place
- ✅ Fixtures pattern established
- ✅ Mock utilities can be added to fixtures/

**Testing infrastructure capabilities:**
- Unit tests (Node environment) - ✅ Working
- Integration tests (Node environment) - Ready
- Component tests (jsdom environment) - Ready
- Coverage reporting - Ready (npm run test:coverage)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Test vector computation:**
   - Decision: Pre-compute MD5 signatures in fixtures file
   - Reason: Tests validate against known values (not circular computation)
   - Benefit: Tests fail if signature algorithm changes unexpectedly

2. **Test organization:**
   - Decision: Separate generatePayFastSignature and validatePayFastSignature test suites
   - Reason: Clear separation of concerns, easier to identify failures
   - Benefit: 15 tests organized into 3 logical groups

3. **Environment configuration:**
   - Decision: Use environmentMatchGlobs instead of inline /** @vitest-environment */ for all files
   - Implementation: Still used inline comment for clarity in test files
   - Benefit: Both patterns work, inline comment is clearer in individual files

## Git Commits

1. **e851e92** - chore(07-01): install and configure Vitest for Next.js 14
   - Installed testing dependencies (Vitest, Testing Library, jsdom)
   - Created vitest.config.ts with environment matching
   - Created vitest.setup.ts with env loading and mock cleanup
   - Added 5 test scripts to package.json
   - Created test directory structure

2. **928a30b** - test(07-01): add PayFast signature unit tests with known test vectors
   - Created payfast-vectors.ts with 4 test vectors
   - Created payfast.test.ts with 15 test cases
   - All tests pass

## Key Metrics

- **Duration:** 6 minutes (from Task 1 start to Summary creation)
- **Tasks completed:** 2/2
- **Tests added:** 15 (all passing)
- **Test files:** 1
- **Dependencies added:** 8 (vitest, testing-library, jsdom, etc.)
- **Files created:** 5 (config, setup, vectors, tests, gitkeep)
- **Files modified:** 1 (package.json)

## Known Limitations

1. **ESM warning:** Vitest shows experimental CommonJS/ESM warning (Node.js experimental feature)
   - Impact: None - tests run successfully
   - Resolution: Cosmetic warning, can be ignored

2. **Baseline browser mapping warning:** Data module is >2 months old
   - Impact: None - not using baseline browser mapping
   - Resolution: Cosmetic warning, can be ignored

## Technical Notes

**PayFast signature algorithm:**
- Alphabetically sort fields by key name
- Exclude `signature` field from hash
- URL encode values, replace `%20` with `+`
- Join with `&` separator
- Append `&passphrase={value}` if passphrase provided
- MD5 hash the resulting string

**Test vector validation:**
Test vectors are independently verifiable:
```bash
# Without passphrase
echo -n "amount=1500.00&item_name=DraggonnB+CRMM+-+Starter+Plan&merchant_id=10000100&merchant_key=46f0cd694581a" | md5sum

# With passphrase
echo -n "amount=3500.00&item_name=DraggonnB+CRMM+-+Professional+Plan&merchant_id=10000100&merchant_key=46f0cd694581a&passphrase=testpassphrase123" | md5sum
```

## Success Criteria Achievement

✅ **All success criteria met:**
1. TEST-01 satisfied - PayFast signature validation has unit tests with known test vectors ✅
2. Vitest runs without configuration errors ✅
3. All PayFast signature tests pass ✅
4. Test framework ready for additional tests (07-02) ✅

**Status:** COMPLETE - Ready for 07-02 (Auth middleware and CRM API tests)
