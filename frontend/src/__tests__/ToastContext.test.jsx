import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ToastProvider, useToast } from "../context/ToastContext";

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast("Success message", "success")}>Show Success</button>
      <button onClick={() => toast("Error message", "error")}>Show Error</button>
      <button onClick={() => toast("Info message")}>Show Info</button>
    </div>
  );
}

describe("ToastContext", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );
    expect(screen.getByText("Child")).toBeDefined();
  });

  it("shows success toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    act(() => {
      screen.getByText("Show Success").click();
    });
    expect(screen.getByText("Success message")).toBeDefined();
  });

  it("shows error toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );
    act(() => {
      screen.getByText("Show Error").click();
    });
    expect(screen.getByText("Error message")).toBeDefined();
  });
});
