# Test Theater Pattern Library

Reference data for the test theater agent. Injected by the SessionStart hook into agent context.

---

## Pattern 1: Tautological Assertion

**ID**: `tautological-assertion`  
**Severity**: critical  
**Languages**: Python, JavaScript, TypeScript, C#, PowerShell

**Description**: An assertion that is always true or always false regardless of the code under test. The test passes unconditionally, providing zero assurance.

**Detection heuristics**:
- `assert True`, `assert 1 == 1`, `assertEqual(1, 1)`
- Assertion comparing a literal to itself (`assert x == x`)
- `expect(true).toBe(true)` or equivalent framework forms
- Assert with no relationship to the system under test's output

**Example (bad)**:
```python
def test_user_creation():
    user = User("alice")
    assert True  # never fails
```

**Example (good)**:
```python
def test_user_creation():
    user = User("alice")
    assert user.name == "alice"
    assert user.id is not None
```

**Remediation**: Replace with an assertion that tests the actual return value, state change, or exception behavior of the code under test.

---

## Pattern 2: Over-Mocked Test

**ID**: `over-mocked-test`  
**Severity**: warning  
**Languages**: Python, JavaScript, TypeScript, C#

**Description**: A test where every meaningful dependency is mocked or stubbed, so no real code is exercised. The test verifies that mocks are called, not that the system works.

**Detection heuristics**:
- All external calls are mocked AND the assertion only checks mock call counts or return values
- No real object instantiation; only `MagicMock`, `jest.fn()`, `Mock.Of<>()` throughout
- The production code path never executes real logic

**Example (bad)**:
```python
def test_send_email():
    mailer = MagicMock()
    service = EmailService(mailer)
    service.send("hi")
    mailer.send.assert_called_once()  # only proves mock wiring
```

**Example (good)**:
```python
def test_send_email_formats_subject():
    mailer = MagicMock()
    service = EmailService(mailer)
    service.send("hi", recipient="alice@example.com")
    args = mailer.send.call_args
    assert "hi" in args[0][0]  # checks real formatting logic
```

**Remediation**: Keep mocks for I/O boundaries only. Assert on observable outputs of the real logic, not on mock interactions.

---

## Pattern 3: Empty Test Body

**ID**: `empty-test-body`  
**Severity**: critical  
**Languages**: Python, JavaScript, TypeScript, C#, PowerShell

**Description**: A test function with no assertions, or with only a `pass` / comment body. It always passes and verifies nothing.

**Detection heuristics**:
- Test function body is `pass`, `{}`, or contains only comments
- Function ends without any assertion, `raise`, or `expect` call
- `TODO` or `FIXME` comments inside test body

**Example (bad)**:
```python
def test_payment_processed():
    pass  # TODO: fill this in
```

**Example (good)**:
```python
def test_payment_processed():
    result = PaymentProcessor().charge(card, 100)
    assert result.success is True
    assert result.transaction_id is not None
```

**Remediation**: Implement the test or delete it. Placeholder tests create false confidence in coverage metrics.

---

## Pattern 4: Commented-Out Assertion

**ID**: `commented-out-assertion`  
**Severity**: warning  
**Languages**: Python, JavaScript, TypeScript, C#, PowerShell

**Description**: An assertion that has been commented out, leaving no verification. The test body runs but proves nothing.

**Detection heuristics**:
- Lines starting with `#`, `//`, or `/*` that contain assertion keywords (`assert`, `expect`, `should`, `assertEqual`, `verify`)
- Entire assertion blocks commented out within a test function

**Example (bad)**:
```python
def test_discount_applied():
    cart = Cart()
    cart.add_promo("SAVE10")
    # assert cart.total() == 90  # broken after refactor, disabled
```

**Example (good)**:
```python
def test_discount_applied():
    cart = Cart()
    cart.add_promo("SAVE10")
    assert cart.total() == 90
```

**Remediation**: Either fix and re-enable the assertion, or delete the test. A test with only commented-out assertions must not remain in the suite.

---

## Pattern 5: Exception Suppression

**ID**: `exception-suppression`  
**Severity**: critical  
**Languages**: Python, JavaScript, TypeScript, C#, PowerShell

**Description**: A test that catches all exceptions (bare `except`, `catch (Exception e)`, `.catch(() => {})`) and suppresses them, preventing failures from surfacing. The test always passes even when the code under test throws.

**Detection heuristics**:
- `except:` or `except Exception:` with no re-raise
- `catch {}` empty catch block
- `try { ... } catch (Exception e) { /* swallowed */ }` with no assertion on the exception
- `.catch(err => {})` with no assertion or re-throw

**Example (bad)**:
```python
def test_api_call():
    try:
        result = api.get("/users")
    except Exception:
        pass  # network flakiness, ignore
```

**Example (good)**:
```python
def test_api_call():
    result = api.get("/users")
    assert result.status_code == 200
```

**Remediation**: Remove the bare exception handler. If you expect a specific exception, use `pytest.raises(SpecificException)` or equivalent. Never suppress unexpected failures.

---

## Pattern 6: Mock Return Assertion

**ID**: `mock-return-assertion`  
**Severity**: warning  
**Languages**: Python, JavaScript, TypeScript, C#

**Description**: A test that asserts on the return value of a mock rather than the real behavior. The assertion proves only that the mock was configured correctly, not that the system works.

**Detection heuristics**:
- `mock.return_value` or `mock.side_effect` value is directly asserted
- `jest.fn().mockReturnValue(x)` followed by asserting `x`
- The asserted value was set by the test itself via mock configuration

**Example (bad)**:
```python
def test_get_user():
    repo = MagicMock()
    repo.find.return_value = User("alice")
    result = repo.find("alice")
    assert result.name == "alice"  # asserting the mock config, not real code
```

**Example (good)**:
```python
def test_get_user():
    repo = MagicMock()
    repo.find.return_value = User("alice")
    service = UserService(repo)
    result = service.get_user("alice")  # test real service logic
    assert result.display_name == "Alice"  # real formatting applied
```

**Remediation**: Assert on the output of the real code under test, not on the mock's configured return value.

---

## Pattern 7: Duplicate Assertion

**ID**: `duplicate-assertion`  
**Severity**: info  
**Languages**: Python, JavaScript, TypeScript, C#, PowerShell

**Description**: A test that repeats the same assertion as another test in the same file, adding no new coverage. Fails together with the original, masking the real failure source.

**Detection heuristics**:
- Identical assertion expressions appear in two or more test functions
- Two tests with different names but identical assertion bodies
- Copy-pasted test blocks where only the test name was changed

**Example (bad)**:
```python
def test_user_active():
    user = User("alice", status="active")
    assert user.is_active() is True

def test_user_active_v2():  # duplicate
    user = User("alice", status="active")
    assert user.is_active() is True
```

**Example (good)**:
```python
def test_user_active():
    assert User("alice", status="active").is_active() is True

def test_user_inactive():
    assert User("alice", status="inactive").is_active() is False
```

**Remediation**: Remove duplicates. If two test names are needed, parameterize the test.

---

## Pattern 8: Implementation Detail Test

**ID**: `implementation-detail-test`  
**Severity**: warning  
**Languages**: Python, JavaScript, TypeScript, C#

**Description**: A test that verifies the internal structure or private mechanics of the code (private methods, internal state, call order) rather than externally observable behavior. Breaks on any refactor even when behavior is preserved.

**Detection heuristics**:
- Direct access to `_private` or `__private` attributes
- Assertions on method call order that do not affect output
- Assertions on internal state that is not exposed via public API
- Mocking and asserting on private helper functions

**Example (bad)**:
```python
def test_cache_uses_lru():
    cache = Cache()
    cache.get("key")
    assert cache._eviction_policy == "lru"  # internal detail
```

**Example (good)**:
```python
def test_cache_evicts_oldest_on_overflow():
    cache = Cache(max_size=2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    assert cache.get("a") is None  # oldest evicted — observable behavior
```

**Remediation**: Rewrite to assert on public API outputs, return values, side effects, or raised exceptions. Delete tests that can only pass by reaching into private state.
