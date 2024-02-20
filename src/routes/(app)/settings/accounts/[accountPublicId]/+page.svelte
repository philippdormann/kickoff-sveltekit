<script lang="ts">
  // Env Variables
  import { PUBLIC_AWS_S3_BUCKET_URL } from '$env/static/public';

  // Utils
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { createAccountInviteSchema, deleteAccountSchema } from '$lib/validations/account';
  import * as flashModule from 'sveltekit-flash-message/client';

  // Components
  import * as Form from '$components/ui/form';
  import { Input } from '$components/ui/input';
  import * as Avatar from '$lib/components/ui/avatar';
  import { Button } from '$components/ui/button';
  import * as AlertDialog from '$components/ui/alert-dialog';
  import { Separator } from '$components/ui/separator';

  // Icons
  import { Reload } from 'radix-icons-svelte';

  export let data;

  const createAccountInviteForm = superForm(data.createAccountInviteForm, {
    validators: zodClient(createAccountInviteSchema),
    invalidateAll: true,
    delayMs: 500,
    multipleSubmits: 'prevent',
    syncFlashMessage: false,
    flashMessage: {
      module: flashModule
    }
  });

  const {
    form: createAccountInviteFormData,
    enhance: createAccountInviteFormEnhance,
    delayed: createAccountInviteFormDelayed
  } = createAccountInviteForm;

  const deleteAccountForm = superForm(data.deleteAccountForm, {
    validators: zodClient(deleteAccountSchema),
    invalidateAll: true,
    delayMs: 500,
    multipleSubmits: 'prevent',
    syncFlashMessage: false,
    flashMessage: {
      module: flashModule
    }
  });

  const {
    form: deleteAccountFormData,
    enhance: deleteAccountFormEnhance,
    delayed: deleteAccountFormDelayed
  } = deleteAccountForm;

  const leaveAccountForm = superForm(data.leaveAccountForm, {
    invalidateAll: true,
    multipleSubmits: 'prevent',
    syncFlashMessage: false,
    flashMessage: {
      module: flashModule
    }
  });

  const {
    form: leaveAccountformData,
    delayed: leaveAccountFormDelayed,
    enhance: leaveAccountFormEnhance
  } = leaveAccountForm;
</script>

<div>
  <h1 class="text-2xl font-semibold">{data.account.name}</h1>
  <p class="text-secondary-foreground">{data.account.type} account</p>
</div>

<div class="py-4">
  <h2 class="text-lg font-semibold">Members</h2>
  <ul class="flex w-full flex-wrap gap-4 pt-2">
    {#each data.account.members as member}
      <li class="flex flex-col items-center justify-center">
        <Avatar.Root class="ring-border ring-2">
          {#if member.user.avatar}
            <Avatar.Image src={`${PUBLIC_AWS_S3_BUCKET_URL}/avatars/${member.user.avatar}`} alt={member.user.email} />
          {/if}
          <Avatar.Fallback class="uppercase">{member.user.email?.charAt(0)}</Avatar.Fallback>
        </Avatar.Root>
        <p class="mt-1 text-sm font-light">{member.role}</p>
      </li>
    {/each}
  </ul>
</div>

{#if data.account.type !== 'personal'}
  {#if data.account.members.find((member) => member.userId === data.user?.id && member.role === 'admin')}
    <Separator class="my-4" />
    <h2 class="text-lg font-semibold">Invite a new member</h2>
    <form
      id="invite-form-{data.account.id}"
      method="POST"
      action="?/createAccountInvite"
      use:createAccountInviteFormEnhance
    >
      <Input type="hidden" name="accountId" value={$createAccountInviteFormData.accountId} />
      <Form.Field form={createAccountInviteForm} name="email" let:constraints>
        <Form.Control let:attrs>
          <Form.Label hidden>Email</Form.Label>
          <Input
            type="email"
            autocapitalize="none"
            autocorrect="off"
            autocomplete="username"
            bind:value={$createAccountInviteFormData.email}
            {...attrs}
            {...constraints}
          />
          <Form.FieldErrors />
        </Form.Control>
      </Form.Field>

      <Form.Button type="submit" disabled={$createAccountInviteFormDelayed} class="my-2 w-full">
        {#if $createAccountInviteFormDelayed}
          <Reload class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Invite
      </Form.Button>
    </form>

    <Separator class="my-4" />

    <h2 class="text-lg font-semibold">Danger Zone</h2>
    <form id="leave-account-form" method="POST" action="?/leaveAccount" use:leaveAccountFormEnhance>
      <Form.Field form={leaveAccountForm} name="accountId">
        <Form.Control let:attrs>
          <Form.Label hidden>Account ID</Form.Label>
          <Input type="hidden" bind:value={data.account.id} {...attrs} />
        </Form.Control>
      </Form.Field>

      <Form.Field form={leaveAccountForm} name="userId">
        <Form.Control let:attrs>
          <Form.Label hidden>User ID</Form.Label>
          <Input type="hidden" value={data.user?.id} {...attrs} />
        </Form.Control>
      </Form.Field>

      <Form.Button type="submit" variant="destructive" disabled={$leaveAccountFormDelayed} class="my-2 w-full">
        {#if $leaveAccountFormDelayed}
          <Reload class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Leave Account
      </Form.Button>
    </form>

    <AlertDialog.Root>
      <AlertDialog.Trigger class="w-full">
        <Button variant="destructive" class="my-2 w-full">Delete Team Account</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
          <AlertDialog.Description>
            This action cannot be undone. Are you sure you want to delete the account and remove its data from our
            servers?
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Back to safety</AlertDialog.Cancel>
          <AlertDialog.Action class="bg-destructive/90 text-destructive-foreground hover:bg-destructive">
            <form
              id="delete-account-form-{data.account.id}"
              method="POST"
              action="?/deleteAccount"
              use:deleteAccountFormEnhance
            >
              <Form.Field form={deleteAccountForm} name="accountId" class="space-y-0">
                <Form.Control let:attrs>
                  <Form.Label hidden>Account ID</Form.Label>
                  <Input type="hidden" bind:value={$deleteAccountFormData.accountId} {...attrs} />
                  <Form.FieldErrors />
                </Form.Control>
              </Form.Field>

              <button type="submit" disabled={$deleteAccountFormDelayed}>
                {#if $deleteAccountFormDelayed}
                  <Reload class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Continue
              </button>
            </form>
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {/if}
{/if}
