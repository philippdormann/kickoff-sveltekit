<script lang="ts">
  // Env Variables
  import { PUBLIC_AWS_S3_BUCKET_URL } from '$env/static/public';

  // Utils
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { editAccountSchema } from '$lib/validations/auth';
  import * as flashModule from 'sveltekit-flash-message/client';
  import { error } from '@sveltejs/kit';
  import { validateAvatarFile } from '$lib/validations/files';
  import { fade } from 'svelte/transition';
  import { toast } from 'svelte-sonner';

  // Components
  import * as Form from '$components/ui/form';
  import { Input } from '$components/ui/input';
  import { Button } from '$components/ui/button';
  import * as AlertDialog from '$components/ui/alert-dialog';
  import * as Alert from '$components/ui/alert';
  import { Separator } from '$components/ui/separator';

  // Assets
  import avatarPlaceholder from '$lib/assets/avatar.png';
  import { Reload, CrossCircled } from 'radix-icons-svelte';
  import FormWrapper from '$components/FormWrapper.svelte';

  export let data;

  let fileUploadStatus: 'ready' | 'uploading' | 'uploaded' | 'failed' = 'ready';
  let fileUploadProgress: number = 0;
  let fileUploadErrors: string[] = [];
  let avatarFileId: string | null = null;
  let avatarPreviewUrl: string | null = null;

  const form = superForm(data.form, {
    validators: zodClient(editAccountSchema),
    invalidateAll: true,
    delayMs: 500,
    multipleSubmits: 'prevent',
    syncFlashMessage: false,
    flashMessage: {
      module: flashModule
    },
    onSubmit: async ({ formData, cancel }) => {
      if (avatarFileId) {
        formData.set('avatar', avatarFileId as string);
      } else {
        formData.delete('avatar');
      }

      // prevent a request if the form is empty
      if (!avatarFileId) {
        cancel();
        toast.error('No changes were made');
      }
    }
  });

  const { enhance, delayed } = form;

  const uploadAvatar = async (event: Event) => {
    fileUploadStatus = 'ready';

    try {
      const avatarInputField: HTMLInputElement = event.target as HTMLInputElement;
      if (!avatarInputField.files) return;
      const avatarFile = avatarInputField.files[0];

      const { valid, errors } = validateAvatarFile(avatarFile);
      if (!valid) {
        fileUploadStatus = 'failed';
        fileUploadErrors = errors;
        toast.error(fileUploadErrors[0]);
        return;
      }

      const getPresignedUrl = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          fileType: avatarFile.type,
          destinationDirectory: 'avatars'
        })
      });

      const { fileName, presignedUrl } = await getPresignedUrl.json();

      const xhr = new XMLHttpRequest();

      xhr.upload.onloadstart = () => {
        fileUploadStatus = 'uploading';
      };

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          fileUploadProgress = Math.round((e.loaded / e.total) * 100);
        }
      };

      xhr.open('PUT', presignedUrl, true);
      xhr.setRequestHeader('Content-Type', avatarFile.type);
      xhr.send(avatarFile);

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            console.log('success');
            avatarPreviewUrl = `${PUBLIC_AWS_S3_BUCKET_URL}/avatars/${fileName}`;
            fileUploadStatus = 'uploaded';
            fileUploadProgress = 0;

            document.getElementById('edit-account-form')?.dispatchEvent(new Event('submit'));
          } else {
            console.log('failure');
            fileUploadStatus = 'failed';
            fileUploadErrors = ['Error uploading avatar'];
            fileUploadProgress = 0;
            toast.error('Error uploading avatar');
            error(500, 'Error uploading avatar');
          }
        }
      };

      avatarFileId = fileName ?? '';
    } catch (err) {
      fileUploadStatus = 'failed';
      fileUploadErrors = ['Error uploading avatar'];
      fileUploadProgress = 0;
      toast.error('Error uploading avatar');
      error(500, 'Error uploading avatar');
    }
  };

  $: userAvatar = data.user?.avatar ? `${PUBLIC_AWS_S3_BUCKET_URL}/avatars/${data.user.avatar}` : avatarPlaceholder;
</script>

<div class="grid flex-1 content-center">
  <FormWrapper>
    <h3 class="self-start text-lg font-semibold uppercase">User Profile</h3>
    <div
      id="avatar-preview"
      class="flex shrink-0 items-center justify-center p-2 {fileUploadStatus === 'uploading'
        ? 'loading loading-infinity loading-lg text-primary'
        : ''}}"
    >
      <img
        src={avatarPreviewUrl ?? userAvatar}
        alt="avatar preview"
        class="h-32 w-32 rounded-full border-4 border-border object-cover ring-4 ring-accent drop-shadow-sm transition-all duration-300 ease-in-out hover:border-primary/30"
      />
    </div>

    <form id="edit-account-form" method="POST" action="?/edit" enctype="multipart/form-data" use:enhance>
      <Form.Field name="avatar" {form} let:constraints>
        <Form.Control let:attrs>
          <Form.Label>Avatar</Form.Label>
          <Input
            type="file"
            on:change={uploadAvatar}
            disabled={fileUploadStatus === 'uploading'}
            {...attrs}
            {...constraints}
          />
          <Form.FieldErrors />
        </Form.Control>
      </Form.Field>

      {#if fileUploadStatus === 'uploading'}
        <div class="w-full py-2">
          <progress
            transition:fade
            class="h-2 w-full overflow-hidden rounded-full bg-primary/20"
            value={fileUploadProgress}
            max="100"
            aria-label="avatar upload progress"
          />
        </div>
      {/if}

      <Form.Button disabled={$delayed} variant="secondary" class="my-2 hidden w-full">
        {#if $delayed}
          <Reload class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Update
      </Form.Button>
    </form>

    {#if fileUploadStatus === 'failed'}
      {#each fileUploadErrors as error}
        <Alert.Root variant="destructive" class="inline-flex items-center gap-2 py-2">
          <div>
            <CrossCircled class="h-6 w-6" />
          </div>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      {/each}
    {/if}

    <div class="my-2">
      <Separator />
    </div>

    <AlertDialog.Root>
      <AlertDialog.Trigger class="w-full">
        <Button variant="destructive" class="my-2 w-full">Delete Account</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
          <AlertDialog.Description>
            This action cannot be undone. This will permanently delete your account and remove your data from our
            servers.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Back to safety</AlertDialog.Cancel>
          <AlertDialog.Action class="bg-destructive/90 text-destructive-foreground hover:bg-destructive">
            <form
              id="delete_account"
              action="?/cancel"
              method="POST"
              class="mx-auto flex w-full flex-col items-center justify-center"
            >
              <button type="submit">Continue</button>
            </form>
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  </FormWrapper>
</div>

<style>
  progress::-webkit-progress-value {
    background-color: #1e293b;
  }
</style>
