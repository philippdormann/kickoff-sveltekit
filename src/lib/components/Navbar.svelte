<script lang="ts">
  // Utils
  import { applyAction, enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { slide } from 'svelte/transition';

  // Components
  import { Button } from '$components/ui/button';

  // Icons
  import { HamburgerMenu, Exit, Cross1 } from 'radix-icons-svelte';

  export let user: object | null = null;
  let isMenuOpen = false;

  const toggleMenuState = (e: Event) => {
    if (e.type === 'focusout' && !isMenuOpen) return;
    isMenuOpen = !isMenuOpen;
  };
</script>

<nav>
  <div class="flex items-center justify-between p-4">
    <div class="flex-1 px-2">
      <a href="/" class="btn-ghost btn text-xl font-bold normal-case">Kickoff SvelteKit</a>
    </div>

    <div class="hidden gap-2 lg:inline-flex">
      {#if !user}
        <Button href="/login" variant="outline" class="transition-none">Login</Button>
        <Button href="/register" variant="outline" class="transition-none">Register</Button>
      {:else}
        <Button href="/settings/profile" variant="outline" class="transition-none">Settings</Button>
        <Button form="logout" type="submit" variant="outline" class="transition-none">
          <Exit class="mr-1 h-4 w-4" />
          Log out
        </Button>
      {/if}
    </div>

    <!-- Mobile Menu Icon -->
    <div class="lg:hidden">
      <Button on:click={toggleMenuState} variant="ghost">
        {#if isMenuOpen}
          <Cross1 />
        {:else}
          <HamburgerMenu />
        {/if}
      </Button>
    </div>
  </div>

  <!-- Mobile Dropdown Menu -->
  {#if isMenuOpen}
    <div transition:slide class="bg-muted fixed w-full rounded-lg lg:hidden">
      <div class="flex w-full flex-col gap-2 p-4">
        {#if !user}
          <Button href="/login" variant="link" on:click={toggleMenuState} class="text-accent-foreground">Login</Button>
          <Button href="/register" variant="link" on:click={toggleMenuState} class="text-accent-foreground"
            >Register</Button
          >
        {:else}
          <Button href="settings/profile" variant="link" on:click={toggleMenuState} class="text-accent-foreground"
            >Settings</Button
          >
          <Button form="logout" type="submit" variant="link" on:click={toggleMenuState} class="text-accent-foreground">
            <Exit class="mr-1 h-4 w-4" />
            Log out
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <form
    id="logout"
    action="/logout"
    method="POST"
    use:enhance={() => {
      return async ({ result }) => {
        await applyAction(result);
        invalidateAll();
      };
    }}
  />
</nav>
