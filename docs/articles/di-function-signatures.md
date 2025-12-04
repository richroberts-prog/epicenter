# Dependency Injection Function Signatures

You're writing a function that needs two services injected, plus a string argument to operate on. Should dependencies come first? Last? In the same object as the arguments?

A factory function is almost always the right choice. Dependencies go in the outer function; arguments go in the returned function or methods.

## The Problem

You have a function that depends on two services:

```typescript
function processData(serviceA, serviceB, inputString) {
  // needs all three to work
}
```

How do you structure the signature for dependency injection?

## Three Options

**Option A: Dependencies first (flat)**
```typescript
function processData({ serviceA, serviceB }, inputString) { ... }
```

**Option B: Arguments first (flat)**
```typescript
function processData(inputString, { serviceA, serviceB }) { ... }
```

**Option C: Factory function** (currying or object with methods)
```typescript
// Returns a function (currying)
function createProcessData({ serviceA, serviceB }) {
  return (inputString) => {
    // implementation using serviceA, serviceB
  };
}

// Returns an object with methods
function createDataProcessor({ serviceA, serviceB }) {
  return {
    process(inputString) {
      // implementation using serviceA, serviceB
    }
  };
}
```

Option C wins. Here's why.

This is one of the few cases where currying genuinely fits in JavaScript. Most currying examples feel contrived, but dependency injection has a natural two-phase lifecycle that the pattern captures well.

## Different Lifecycles

Dependencies and arguments have completely different lifecycles. Dependencies are wired at app startup, at the composition root. Arguments vary per call.

```typescript
// Currying
const processData = createProcessData({
  serviceA: createServiceA(),
  serviceB: createServiceB(),
});
processData("my input"); // just the argument

// Object with methods
const dataProcessor = createDataProcessor({
  serviceA: createServiceA(),
  serviceB: createServiceB(),
});
dataProcessor.process("my input"); // method call
```

The factory pattern reflects this reality. You configure once at startup, then call repeatedly at runtime. The caller doesn't need to know about dependencies at all.

## Cleaner Call Sites

With flat signatures, every call carries the dependency bag:

```typescript
// Option A: every single call
processData({ logger, validator }, "input1");
processData({ logger, validator }, "input2");
processData({ logger, validator }, "input3");
```

With a factory function, the call site is clean:

```typescript
// Currying
// Only need to create processData function once
const processData = createProcessData({ logger, validator });
processData("input1");
processData("input2");
processData("input3");

// Object with methods
// Only need to create dataProcessor object once
const dataProcessor = createDataProcessor({ logger, validator });
dataProcessor.process("input1");
dataProcessor.process("input2");
dataProcessor.process("input3");
```

## Testing Ergonomics

Create the service once with mocks, then test multiple inputs:

```typescript
const dataProcessor = createDataProcessor({
  serviceA: mockServiceA,
  serviceB: mockServiceB,
});

// test various inputs without re-injecting
expect(dataProcessor.process("valid")).toBe(expectedResult);
expect(dataProcessor.process("edge-case")).toBe(edgeCaseResult);
expect(() => dataProcessor.process("invalid")).toThrow();
```

No re-injection for every test case.

## Currying vs Object with Methods

**Return a function** when you have a single operation and want functional composition:

```typescript
const processData = createProcessData({ serviceA, serviceB });
const results = inputs.map(processData); // composes naturally
```

**Return an object with methods** when you have multiple related operations sharing dependencies:

```typescript
function createDataService({ db, logger }) {
  return {
    process(input) { /* uses db, logger */ },
    validate(input) { /* uses db, logger */ },
    transform(input) { /* uses db, logger */ }
  };
}
```

Returning an object is especially common when building services because you typically need multiple methods that share the same configuration. All methods share the injected dependencies without repetition.

## If You Must Use Flat Signatures

Sometimes you're in a simpler context where full composition root wiring is overkill. In that case, go dependencies first:

```typescript
function processData({ serviceA, serviceB }, inputString) { ... }
```

This matches the "configuration before data" pattern from functional programming. Partial application works naturally:

```typescript
const processWithDeps = (input) => processData(deps, input);
```

Arguments-first doesn't compose well. You'd be partially applying the volatile part first, which rarely makes sense.

## The Lesson

Dependencies and arguments have different lifecycles. Factory functions reflect this: configure once at startup, call cleanly at runtime. Your call sites become simpler, your tests become easier, and your code better reflects the actual flow of dependency resolution.

Return a function for single operations that compose well. Return an object with methods when you're building services with multiple related operations.
