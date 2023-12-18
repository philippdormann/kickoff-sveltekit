<script lang="ts">
  import FormWrapper from '$components/FormWrapper.svelte';
</script>

<div class="grid flex-1 content-center pb-12 md:pb-0">
  <FormWrapper>
    <slot />
  </FormWrapper>
</div>
