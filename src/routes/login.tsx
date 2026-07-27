import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEMO_PASSWORD } from "@/features/auth/auth-context"
import { useAuth } from "@/features/auth/use-auth"

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

const loginFormSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

function LoginPage() {
  const auth = useAuth()
  const router = useRouter()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: loginFormSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        await auth.login(value)
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to sign in"
        )
        return
      }

      // Rejoue les `beforeLoad` avec le nouveau contexte d'authentification.
      await router.invalidate()
      await navigate({ to: search.redirect ?? "/dashboard" })
    },
  })

  return (
    <form
      className="flex max-w-sm flex-col gap-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div>
        <h1 className="font-medium">Sign in</h1>
        <p className="text-muted-foreground">
          Any email works. The demo password is
          <code className="mx-1">{DEMO_PASSWORD}</code>.
        </p>
      </div>

      <form.Field name="email">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Password</Label>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive">
                {field.state.meta.errors[0]?.message}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {formError && (
        <p role="alert" className="text-xs text-destructive">
          {formError}
        </p>
      )}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  component: LoginPage,
})
