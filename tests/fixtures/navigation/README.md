# Original navigation interaction reference

`original-navigation.tsx` preserves the navigation module from commit
`d7ee5206e4fd68ae8f998a86063b3d99fc07054a` (before the navigation refactor).
Only trailing whitespace has been removed; executable code is unchanged.
The motion regression temporarily builds it next to the current component,
with the same providers, stylesheet, font and content fixture. It compares
normal focus/blur, active press, link feedback and menu animation against
that real implementation. The original enum collision is retained in the
reference; rapid reversals are tested separately on the corrected component.

This fixture must not be updated simply to accept a regression. Intentional
interaction changes require explicit review. Temporary source adapters/routes
are removed in the test's `finally` block and never belong in production.
