import { useForm } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useCreatePost } from "../api/posts.queries"
import { createPostSchema } from "../schemas/post.schema"

export function PostForm({ onCreated }: { onCreated?: () => void }) {
  const createPost = useCreatePost()

  const form = useForm({
    defaultValues: { title: "", body: "" },
    validators: { onChange: createPostSchema },
    onSubmit: async ({ value, formApi }) => {
      await createPost.mutateAsync(value)
      formApi.reset()
      onCreated?.()
    },
  })

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <h2 className="text-sm font-medium">New post</h2>

      <form.Field name="title">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Title</Label>
            <Input
              id={field.name}
              name={field.name}
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

      <form.Field name="body">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Body</Label>
            <Input
              id={field.name}
              name={field.name}
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

      {createPost.isError && (
        <p role="alert" className="text-xs text-destructive">
          {createPost.error.message}
        </p>
      )}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Creating…" : "Create post"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
